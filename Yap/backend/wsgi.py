from app import app, socketio
import os

application = socketio

if __name__ == "__main__":
    socketio.run(app, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))