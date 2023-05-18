from flask import Flask, render_template, url_for, abort, request
import os
import json

app = Flask(__name__)

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
