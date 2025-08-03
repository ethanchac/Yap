from app import app, socketio
import os

app = socketio  
application = socketio  

@app.route('/test')
def test():
    return {'message': 'WSGI is working!', 'server': 'gunicorn'}

if __name__ == "__main__":
    socketio.run(app, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))