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
                'channel': trace.stats["channel"]}
            }
        traces_data_dict[f'trace-{n}'] = trace_data
   
    return traces_data_dict


@app.route('/upload-mseed-file', methods=['POST'])
def upload():

    if 'file' not in request.files:
        return 'No file uploaded', 400
    
    # Get the uploaded file from the request
    mseed_file = request.files['file']
    
    # Read the MSeed file using obspy
    stream = read(mseed_file)

    stream.write(uploaded_mseed_file_path)
    
    converted_stream = convert_mseed_to_object(stream)
    json_data = jsonify(converted_stream)
    return json_data



@app.route("/apply-filter", methods=["GET"])
def apply_filter():

    filter_value = request.args.get('filter')

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
                mseed_data.filter("bandpass", freqmin=float(freqmin), freqmax=float(freqmax))
    except Exception as e:
        print(e)
    
    converted_mseed_data = convert_mseed_to_object(mseed_data)

    json_data = jsonify(converted_mseed_data)
    
    return json_data
    

@app.route("/apply-processing", methods=["GET"])
def process_signal():

    filter_value = request.args.get('method')

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
                mseed_data.filter("bandpass", freqmin=float(freqmin), freqmax=float(freqmax))
    except Exception as e:
        print(e)
    
    converted_mseed_data = convert_mseed_to_object(mseed_data)

    json_data = jsonify(converted_mseed_data)
    
    return json_data



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
