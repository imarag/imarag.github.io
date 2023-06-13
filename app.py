from flask import Flask, render_template, url_for, abort, request, jsonify, session, Response, session, send_from_directory, send_file, redirect
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
import pandas as pd
import datetime
import uuid
import sqlite3
from flask_sqlalchemy import SQLAlchemy
from flask import flash
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__, static_folder="static")
app.secret_key = '12345asdfg6789lkj'


# ------------------configure the sqlite database-------------------------

app.config ['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///SeismoWeb.sqlite3'
db = SQLAlchemy(app)

class SeismoUsers(db.Model):
    __tablename__ = 'SeismoUsers'
    email = db.Column(db.String(255), unique=True, nullable=False, primary_key=True)
    fullname = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    registered_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# create once
if not os.path.exists('mydatabase.db'):
    with app.app_context():
        db.create_all()

#-------------------------------------------------------------------------

def convert_mseed_to_json(stream):
    traces_data_dict = {}
    first_trace = stream[0]
    starttime = first_trace.stats["starttime"].isoformat()
    fs = float(first_trace.stats["sampling_rate"])
    station = first_trace.stats["station"]
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
            }
        traces_data_dict[f'trace-{n}'] = trace_data
   
    return jsonify(traces_data_dict)


def generate_error_response(message):
    response = jsonify({'error-message': message})
    response.status_code = 400
    return response



#------------------------templates----------------------

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        query = "SELECT * FROM SeismoUsers WHERE email = :email"
        result = db.engine.execute(query, email=email)
        user = result.fetchone()
        users = SeismoUsers.query.all()

        if not user:
            message = 'User not found!'
            flash(message, 'error')
            return redirect(url_for('login'))
            
     
        hashed_password = user['password']
        if not check_password_hash(hashed_password, password):
            message = 'Invalid password!'
            flash(message, 'error')
            return redirect(url_for('login'))
        
        message = 'succesfully logged in!'
        flash(message, 'success')
        return redirect(url_for('home'))
    
    return render_template('login.html')
    
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        fullname = request.form['fullname']
        email = request.form['email']
        password = request.form['password']

        if not fullname: 
            message = "You didn't provide any full name!"
            flash(message, 'error')
            return redirect(url_for('register'))
            
        
        if not email:
            message = "You didn't provide any email!"
            flash(message, 'error')
            return redirect(url_for('register'))
            
        
        if not password:
            message = "You didn't provide any password!"
            flash(message, 'error')
            return redirect(url_for('register'))
            


        # Check if the email is already registered
        query = "SELECT * FROM SeismoUsers WHERE email = :email"
        params = {'email': email}
        result = db.engine.execute(query, email=email)
        user = result.fetchone()
        if user:
            message = 'User already exists!'
            flash(message, 'error')
            return redirect(url_for('register'))
            

        # Create a new user
        hashed_password = generate_password_hash(password)
        query = "INSERT INTO SeismoUsers (fullname, email, password) VALUES (:fullname, :email, :password)"
        params = {'email': email, 'password': hashed_password, 'fullname': fullname}
        db.engine.execute(query, email=email, password=hashed_password, fullname=fullname)
        db.session.commit()

        message = 'Succesfully registered!'
        flash(message, 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')


@app.route('/')
def index():
    return render_template('index.html')
    

@app.route('/templates/<page>', methods=['GET'])
def html_page(page):
    template_full_path = os.path.join(app.root_path, 'templates', page)
    if os.path.exists(template_full_path):
        return render_template(page)
    else:
        return render_template('page-not-found.html')
    




#------------------------functions----------------------



@app.route('/upload-mseed-file', methods=['GET', 'POST'])
def upload():
    global unique_session_id
   
    # check if file exists
    if 'file' not in request.files or len(request.files) < 1:
        generate_error_response('No file uploaded!')

    # Get the uploaded file from the request
    mseed_file = request.files['file']
    # get the page that triggered the mseed file upload
    view_page = request.form['view-page']

    # Read the MSeed file using obspy
    try:
        stream = read(mseed_file)
    except Exception as e:
        generate_error_response(str(e))

    # if the stream has 0 or more that 3 traces abort
    if len(stream) <= 0 or len(stream) > 3:
        error_message = f'The stream must contain up to three traces. Your stream contains {len(stream)} traces!'
        generate_error_response(error_message)

    # if at least one of the traces is empty abort
    for tr in stream:
        if len(tr.data) == 0:
            error_message = 'One or more of your traces in the stream object, is empty.'
            generate_error_response(error_message)

    # if the user hasn't defined nor the fs neither the delta, then error
    if stream[0].stats['sampling_rate'] == 1 and stream[0].stats['delta'] == 1:
        error_message = 'Neither sampling rate (fs[Hz]) nor sample distance (delta[sec]) are specified in the trace objects. Consider including them in the stream traces, for the correct x-axis time representation!'
        generate_error_response(error_message)

    unique_session_id = uuid.uuid4()

    session['user-unique-id'] = unique_session_id
  
    # define the path of the written uploaded file
    raw_mseed_file_path = os.path.join(app.root_path, "static-data", f"user-{session['user-unique-id']}-mseed-file.mseed")
    # write the uploaded file
    stream.write(raw_mseed_file_path)

    if view_page == 'signal-processing':
        processed_mseed_file_path = os.path.join(app.root_path, "static-data", f"user-{session['user-unique-id']}-mseed-file-processed.mseed")
        stream.write(processed_mseed_file_path)


    # convert the uploaded mseed file to json
    json_data = convert_mseed_to_json(stream)
    return json_data


@app.route("/load-test-mseed-file", methods=["GET"])
def load_test_mseed_file():

    # read the test file in the server and
    # assign the path of the loaded file to the raw_mseed_file_path variable
    test_mseed_path = os.path.join(app.root_path, "static-data", f"test.mseed")

    view_page = request.form['view-page']

    # Read the MSeed file using obspy
    try:
        stream = read(test_mseed_path)
    except Exception as e:
        generate_error_response(str(e))
    
    unique_session_id = uuid.uuid4()

    session['user-unique-id'] = unique_session_id
    
    # define the path of the written uploaded file
    raw_mseed_file_path = os.path.join(app.root_path, "static-data", f"user-{session['user-unique-id']}-mseed-file.mseed")
    # write the uploaded file
    stream.write(raw_mseed_file_path)

    if view_page == 'signal-processing':
        processed_mseed_file_path = os.path.join(app.root_path, "static-data", f"user-{session['user-unique-id']}-mseed-file-processed.mseed")
        stream.write(processed_mseed_file_path)


    # convert the uploaded mseed file to json
    json_data = convert_mseed_to_json(stream)
    return json_data



@app.route("/apply-processing-taper", methods=["GET"])
def process_signal_taper():

    processed_mseed_file_path = os.path.join(app.root_path, "static-data", f"user-{session['user-unique-id']}-mseed-file-processed.mseed")
    
    mseed_data = read(processed_mseed_file_path)
    starttime = mseed_data[0].stats.starttime
    total_seconds = mseed_data[0].stats.endtime - starttime

    taper_length = request.args.get('taper-length-input')
    taper_side = request.args.get('taper-side-select')
    taper_type = request.args.get('taper-type-select')

    if not taper_length:
        taper_length = 0.3

    mseed_data.taper(float(taper_length), type=taper_type, side=taper_side)
    mseed_data.write(processed_mseed_file_path)
    json_data = convert_mseed_to_json(mseed_data)
    return json_data

@app.route("/apply-processing-detrend", methods=["GET"])
def process_signal_detrend():
    
    processed_mseed_file_path = os.path.join(app.root_path, "static-data", f"user-{session['user-unique-id']}-mseed-file-processed.mseed")
    
    mseed_data = read(processed_mseed_file_path)
    starttime = mseed_data[0].stats.starttime
    total_seconds = mseed_data[0].stats.endtime - starttime
    
    
    detrend_type = request.args.get('detrend-type-select')
    mseed_data.detrend(type=detrend_type)
    mseed_data.write(processed_mseed_file_path)
    json_data = convert_mseed_to_json(mseed_data)
    return json_data



@app.route("/apply-processing-trim", methods=["GET"])
def process_signal_trim():
    
    processed_mseed_file_path = os.path.join(app.root_path, "static-data", f"user-{session['user-unique-id']}-mseed-file-processed.mseed")
    
    mseed_data = read(processed_mseed_file_path)
    starttime = mseed_data[0].stats.starttime
    total_seconds = mseed_data[0].stats.endtime - starttime
    trim_left_side = request.args.get('trim-left-side-input')
    trim_right_side = request.args.get('trim-right-side-input')

    if not trim_left_side:
        trim_left_side = 0
    if not trim_right_side:
        trim_right_side = total_seconds

    if float(trim_left_side) >= float(trim_right_side):
        error_message = 'The left side cannot be greater or equal to the right side!'
        generate_error_response(error_message)
    
    mseed_data.trim(starttime=starttime+float(trim_left_side), endtime=starttime+float(trim_right_side))
    mseed_data.write(processed_mseed_file_path)
    json_data = convert_mseed_to_json(mseed_data)
    return json_data

@app.route("/delete-applied-filter", methods=["GET"])
def delete_filter():
    raw_mseed_file_path = os.path.join(app.root_path, "static-data", f"user-{session['user-unique-id']}-mseed-file.mseed")
    
    mseed_data = read(raw_mseed_file_path)
    starttime = mseed_data[0].stats.starttime
    total_seconds = mseed_data[0].stats.endtime - starttime
    
    filter_string = request.args.get('filter')

    all_filters = filter_string.split()
    for filt in all_filters:
        if 'detrend' in filt:
            detrend_type = filt.split('-')[1].strip()
            mseed_data.detrend(type=detrend_type)
        elif 'taper' in filt:
            taper_type = filt.split('-')[1].strip()
            taper_side = filt.split('-')[2].strip()
            taper_length = float(filt.split('-')[3].strip())
            mseed_data.taper(float(taper_length), type=taper_type, side=taper_side)
        elif 'trim' in filt:
            trim_left_side = float(filt.split('-')[1].strip())
            trim_right_side = float(filt.split('-')[2].strip())
            mseed_data.trim(starttime=starttime+float(trim_left_side), endtime=starttime+float(trim_right_side))
    
    processed_mseed_file_path = os.path.join(app.root_path, "static-data", f"user-{session['user-unique-id']}-mseed-file-processed.mseed")
    mseed_data.write(processed_mseed_file_path)
    
    json_data = convert_mseed_to_json(mseed_data)
    return json_data



@app.route('/download', methods=['POST'])
def download():
    # Get the JSON data from the request
    data = request.json

    df = pd.DataFrame()
    df['x'] = data[0]['x']
    for tr in data:
        df[tr['name']] = tr['y']
    
    # Create an Excel file from the DataFrame
    excel_file = io.BytesIO()
    with pd.ExcelWriter(excel_file) as writer:
        df.to_excel(writer, index=False)
    excel_file.seek(0)

    # Return the Excel file as a Blob
    return send_file(
        excel_file,
        as_attachment=True,
        download_name='graph_data.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )









@app.route("/apply-filter", methods=["GET"])
def apply_filter():
    mseed_file_path = os.path.join(app.root_path, "static-data", f"user-{session['user-unique-id']}-mseed-file.mseed")
    filter_value = request.args.get('filter')
    error_message = ''
    mseed_data = read(mseed_file_path)
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
    
    json_data = convert_mseed_to_json(mseed_data)

    return json_data
    


@app.route('/compute-fourier', methods=['GET'])
def compute_fourier():
    mseed_file_path = os.path.join(app.root_path, "static-data", f"user-{session['user-unique-id']}-mseed-file.mseed")
    mseed_data = read(mseed_file_path)
    first_trace = mseed_data[0]
    starttime = first_trace.stats.starttime
    total_duration = first_trace.stats.endtime - first_trace.stats.starttime
    station = first_trace.stats.station
    fs = first_trace.stats["sampling_rate"]
    fnyq = fs / 2
    dt = first_trace.stats["delta"]

    signal_window_left_side = request.args.get('signal-window-left-side')
    noise_window_right_side = request.args.get('noise-window-right-side')
    window_length = request.args.get('window-length')
    noise_selected = request.args.get('noise-selected')

    error_message = None

    if float(signal_window_left_side) + float(window_length) >= total_duration:
        error_message = 'The signal window must ends before the time series graph ends! Consider reducing the window side or moving the signal left side to the left'
    elif float(signal_window_left_side) < 0:
        error_message = 'The signal window must start after the time series graph begins! Consider moving the signal left side to the right, inside the graph area'
    elif noise_selected == 'true' and float(noise_window_right_side) > total_duration:
        error_message = 'The noise window must end before the time series graph ends! Consider moving the noise right side to the left'
    elif noise_selected == 'true' and float(noise_window_right_side) - float(window_length) < 0:
        error_message = 'The noise window must start after the time series graph begins! Consider reducing the window side or moving the noise right side to the right'

    if error_message:
        response = jsonify({'error-message': error_message})
        response.status_code = 400
        return response

    traces_data_dict = {}

    for i in range(len(mseed_data)):
        trace_label = f'trace-{i}'
        traces_data_dict[trace_label] = {}
        df_s = mseed_data[i].copy()
        channel = df_s.stats.channel

        df_s.trim(starttime = starttime + float(signal_window_left_side), endtime=starttime + float(signal_window_left_side) + float(window_length))
        npts = df_s.stats["npts"]
        sl = int(npts / 2)
        freq_x = np.linspace(0 , fnyq , sl)
        yf_s = np.fft.fft(df_s.data[:npts]) 
        y_write_s = dt * np.abs(yf_s)[0:sl]

        traces_data_dict[trace_label]['signal'] = {
            'ydata': y_write_s.tolist(),
            'xdata': freq_x.tolist(),
            'stats': {
                'starttime': starttime.isoformat(), 
                'sampling_rate':fs, 
                'station':station, 
                'channel': channel
            }
        }

        if noise_selected != 'false':
            df_p = mseed_data[i].copy()
            df_p.trim(starttime = starttime + float(noise_window_right_side) - float(window_length), endtime=starttime + float(noise_window_right_side))
            yf_p = np.fft.fft(df_p.data[:npts]) 
            y_write_p = dt * np.abs(yf_p)[0:sl]

            traces_data_dict[trace_label]['noise'] = {
                'ydata': y_write_p.tolist(),
                'xdata': freq_x.tolist(),
                'stats': {
                    'starttime': starttime.isoformat(), 
                    'sampling_rate':fs, 
                    'station':station, 
                    'channel': channel
                }
            }
        

    json_data = jsonify(traces_data_dict)
    
    return json_data
    

@app.route('/upload-ascii-file', methods=['POST'])
def upload_file():
    uploaded_file = request.files.get('file')
    
    if not uploaded_file:
        return 'No file uploaded'

    station = request.form.get('station')
    parameterRadioOn = request.form.get('parameter-radio')
    parameterValue = request.form.get('parameter-value')
    compo1 = request.form.get('compo1')
    compo2 = request.form.get('compo2')
    compo3 = request.form.get('compo3')
    datetime = request.form.get('datetime')
    

    compos = [c for c in [compo1, compo2, compo3] if c]

    filename, file_extension = os.path.splitext(uploaded_file.filename)
    file_extension = file_extension.lower()
    
    if file_extension == '.xlsx' or file_extension == '.xls':
        df = pd.read_excel(uploaded_file)
    elif file_extension == '.csv':
        df = pd.read_csv(uploaded_file)
    else:
        return 'Unsupported file type'
    df.columns = compos
    lt_compos = []
    for col in df.columns:
        trace_data = df[col].astype(int).to_numpy().astype(np.int32)
        trace = Trace(
            data=trace_data, 
            header={
                'station': station, 
                parameterRadioOn: float(parameterValue), 
                'npts': len(trace_data), 
                'channel': col,
                'starttime': UTCDateTime(datetime)
                })
        lt_compos.append(trace)
    
    st = Stream(lt_compos)

    st.write('stream.mseed', format='MSEED')

    mime_type = 'application/vnd.fdsn.mseed'

    return send_file(st, as_attachment=True,  mimetype=mime_type, download_name='stream.mseed')





if __name__ == '__main__':
    app.run(debug=True)
