from flask import Flask, render_template, url_for, abort, request, jsonify, session, Response, session, send_from_directory
import os
from flask_session import Session
from flask_compress import Compress
import json
from obspy.core import read, UTCDateTime
from obspy.core.trace import Trace
from obspy.core.stream import Stream
import numpy as np
import gzip
import io

app = Flask(__name__, static_folder="static")
app.secret_key = '12345asdfg6789lkj'

uploaded_mseed_file_path = os.path.join(app.root_path, "static-data", "uploaded-mseed-file.mseed")


def convert_mseed_to_object(stream):
    traces_data_dict = {}
    starttime = stream[0].stats["starttime"].isoformat()
    fs = float(stream[0].stats["sampling_rate"])
    station = stream[0].stats["station"]
    for n, trace in enumerate(stream):
        ydata = trace.data.tolist()
        xdata = trace.times().tolist()

        trace_data = {
            'ydata': ydata,
            'xdata': xdata,
            'stats': {
                'starttime': starttime, 
                'sampling_rate':fs, 
                'station':station, 
                'channel': trace.stats["channel"]
            },
            'warning-message': '',
            }
        traces_data_dict[f'trace-{n}'] = trace_data
   
    return traces_data_dict


@app.route('/upload-mseed-file', methods=['POST'])
def upload():

    if 'file' not in request.files:
        return 'No file uploaded', 400

    # Get the uploaded file from the request
    mseed_file = request.files['file']
    view_page = request.form['view-page']
    
    error_message = ''
    warning_message = ''

    # Read the MSeed file using obspy
    try:
        stream = read(mseed_file)
    except Exception as e:
        error_message = str(e)
        response = jsonify({'error-message': error_message})
        response.status_code = 400
        return response
    
    if view_page == 'pick-arrivals':
        if len(stream[0].data) > 100000:
            error_message = 'The stream that you provided contains too many data (>100.000). Please trim it before uploading it.'
    

    if len(stream) <= 0 or len(stream) > 3:
        error_message = f'The stream must contain one, two or three traces. Your stream contains {len(stream)} traces!'

    if stream[0].stats['sampling_rate'] == 1 and stream[0].stats['delta'] == 1:
        error_message = 'Neither sampling rate (fs[Hz]) nor sample distance (delta[sec]) are specified in the trace objects. Consider including them in the stream traces, for the correct x-axis time representation!'

    for tr in stream:
        if len(tr.data) == 0:
            error_message = 'One or more of your traces in your stream object, is empty.'
    if error_message:
        response = jsonify({'error-message': error_message})
        response.status_code = 400
        return response
    
    stream.write(uploaded_mseed_file_path)
    
    converted_stream = convert_mseed_to_object(stream)

    if warning_message:
        converted_stream['warning-message'] = warning_message

    json_data = jsonify(converted_stream)
    return json_data





@app.route("/apply-filter", methods=["GET"])
def apply_filter():

    filter_value = request.args.get('filter')
    error_message = ''
    mseed_data = read(uploaded_mseed_file_path)
    try:
        if filter_value != 'initial':
            freqmin = filter_value.split('-')[0]
            freqmax = filter_value.split('-')[1]
            if freqmin and not freqmax:
                mseed_data.filter("highpass", freq=float(freqmin))
            elif not freqmin and freqmax:
                mseed_data.filter("lowpass", freq=float(freqmax))
            elif not freqmin and not freqmax:
                pass
            else:
                if float(freqmin) >= float(freqmax):
                    error_message = 'The left filter cannot be greater or equal to the right filter!'
                    response = jsonify({'error-message': error_message})
                    response.status_code = 400
                    return response
                mseed_data.filter("bandpass", freqmin=float(freqmin), freqmax=float(freqmax))
    except Exception as e:
        print(e)
    
    converted_mseed_data = convert_mseed_to_object(mseed_data)

    json_data = jsonify(converted_mseed_data)
    
    return json_data
    

@app.route("/apply-processing", methods=["GET"])
def process_signal():

    processing_value = request.args.get('method')

    mseed_data = read(uploaded_mseed_file_path)
    starttime = mseed_data[0].stats.starttime
    total_seconds = mseed_data[0].stats.endtime - starttime

    if processing_value == 'detrend':
        detrend_type = request.args.get('detrend-type')
        mseed_data.detrend(type=detrend_type)

    elif processing_value == 'taper':
        taper_length = request.args.get('taper-length')
        taper_side = request.args.get('taper-side')
        taper_type = request.args.get('taper-type')
        if not taper_length:
            taper_length = 0.3
        mseed_data.taper(float(taper_length), type=taper_type, side=taper_side)
    
    elif processing_value == 'trim':
        trim_left_side = request.args.get('trim-left-side')
        trim_right_side = request.args.get('trim-right-side')

        if not trim_left_side:
            trim_left_side = 0
        if not trim_right_side:
            trim_right_side = total_seconds

        if float(trim_left_side) >= float(trim_right_side):
            error_message = 'The left side cannot be greater or equal to the right side!'
            response = jsonify({'error-message': error_message})
            response.status_code = 400
            return response
        
        mseed_data.trim(starttime=starttime+float(trim_left_side), endtime=starttime+float(trim_right_side))
    
    mseed_data.write(uploaded_mseed_file_path)

    converted_mseed_data = convert_mseed_to_object(mseed_data)

    json_data = jsonify(converted_mseed_data)
    
    return json_data


@app.route('/compute-fourier', methods=['GET'])
def compute_fourier():

    mseed_data = read(uploaded_mseed_file_path)
    starttime = mseed_data[0].stats.starttime
    total_seconds = mseed_data[0].stats.endtime - starttime
    fs = mseed_data[0].stats["sampling_rate"]
    fnyq = fs / 2
    dt = mseed_data[0].stats["delta"]
    npts = mseed_data[0].stats["npts"]
    sl = int(npts / 2)
    freq_x = np.linspace(0 , fnyq , sl)

    where = request.args.get('where')

    if where == 'signal':
        for i in range(len(mseed_data)):
            df_s = mseed_data[i].copy()
            yf_s = np.fft.fft(df_s.data[:npts]) 
            y_write_s = dt * np.abs(yf_s)[0:sl] 
    else:
        pass
    
    



@app.route('/')
def index():
    return render_template('index.html')




@app.route('/templates/all-topics-page.html', methods=['GET'])
def all_topics_view():
    search_string = request.args.get('search-string')
    with open('all-topics-info.json', 'r') as f:
        data = json.load(f)
    if not search_string:
        all_topics_dict = data['all-topics']
    else:
        lt = []
        for tp_dct in data['all-topics']:
            if search_string in tp_dct["title"]:
                lt.append(tp_dct)
        all_topics_dict = lt
    return render_template('all-topics-page.html', all_topics_dict = all_topics_dict)

    

@app.route('/templates/<page>', methods=['GET'])
def html_page(page):
    if '.html' in page:
        template_page = page
    else:
        template_page = page + '.html'
    template_full_path = os.path.join(app.template_folder, template_page)
    if os.path.exists(template_full_path):
        return render_template(template_page)
    else:
        abort(404)


    
@app.errorhandler(404)
def page_not_found(error):
    return "Page not found"

if __name__ == '__main__':
    app.run(debug=True)
