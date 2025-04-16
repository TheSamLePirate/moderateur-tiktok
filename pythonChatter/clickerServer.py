from flask import Flask, request, jsonify
import pyperclip
import pyautogui
import time
import os
import queue
import threading

app = Flask(__name__)
controlCommand="ctrl"
print(os.name)
if os.name == 'nt':
    controlCommand = "ctrl"

if os.name == 'posix':
    controlCommand = "command"

if os.name == 'mac':
    controlCommand = "command"

#linux
if os.name == 'linux':
    controlCommand = "ctrl"

# Create a queue for paste operations
paste_queue = queue.Queue()

# Flag to control the worker thread
worker_running = True

def process_paste(message, delay=1.5):
    """Process a paste operation - splitting into chunks and pasting"""
    # Chunk the message if needed
    MAX_CHARS = 100
    responses = []
    
    # Split message into words
    words = message.split()
    current_chunk = ""
    
    for word in words:
        # Check if adding this word would exceed the limit
        # Allow space for the numbering (e.g., "1/10") that will be added later
        # Conservatively allocate 6 characters for this (up to "10/10")
        if len(current_chunk + " " + word) <= MAX_CHARS - 6:
            if current_chunk:
                current_chunk += " " + word
            else:
                current_chunk = word
        else:
            # Current chunk is full, add it to responses and start a new chunk
            responses.append(current_chunk)
            current_chunk = word
    
    # Add the last chunk if it's not empty
    if current_chunk:
        responses.append(current_chunk)
    
    # Paste each chunk
    total_chunks = len(responses)
    
    for i, chunk in enumerate(responses, 1):
        #make sure no chunk start with @GentilRobot. Replace it with ""
        if chunk.startswith('@GentilRobot'):
            chunk = chunk.replace('@GentilRobot', '')
        if total_chunks > 1:
            formatted_chunk = f"{chunk} {i}/{total_chunks}"
        else:
            formatted_chunk = f"{chunk}"
        pyperclip.copy(formatted_chunk)
        pyautogui.hotkey(controlCommand, 'v',interval=0.25)
        pyautogui.press('enter')
        time.sleep(delay)
    
    return total_chunks

def worker():
    """Worker function to process paste operations from the queue"""
    print("Paste worker thread started")
    while worker_running:
        try:
            # Get a paste operation from the queue with a timeout
            task = paste_queue.get(timeout=1.0)
            print(f"Processing paste: {task['message'][:30]}...")
            
            # Process the paste operation
            chunks = process_paste(task['message'], task['delay'])
            
            # Mark the task as done
            paste_queue.task_done()
            print(f"Paste completed: {chunks} chunks")
        except queue.Empty:
            # No task in queue, continue waiting
            pass
        except Exception as e:
            print(f"Error in paste worker: {e}")

@app.route('/')
def index():
    return jsonify({'message': 'ok', 'queue_size': paste_queue.qsize()})

@app.route('/paste', methods=['POST'])
def paste_message():
    """
    Receive a message via POST request and add it to the paste queue
    """
    # Get the message from the POST request
    data = request.json
    
    if not data or 'message' not in data:
        return jsonify({'error': 'No message provided'}), 400
    
    message = data['message']
    delay = data.get('delay', 1.5)  # Default delay of 1.5 seconds between chunks
    print(f"Received message for queue: {message[:30]}...")
    
    # Add the paste operation to the queue
    task = {
        'message': message,
        'delay': delay
    }
    paste_queue.put(task)
    
    queue_position = paste_queue.qsize()
    
    return jsonify({
        'success': True,
        'queued': True,
        'queue_position': queue_position,
        'message': f'Message queued successfully at position {queue_position}'
    })

if __name__ == '__main__':
    print("Starting Flask server for message pasting...")
    print("Send POST requests to http://localhost:5000/paste with JSON body: {'message': 'your message'}")
    
    # Start the worker thread
    worker_thread = threading.Thread(target=worker)
    worker_thread.daemon = True
    worker_thread.start()
    
    # Allow some time for the user to switch to the target window after starting the server
    print("You have 5 seconds to switch to the target window...")
    time.sleep(5)
    
    try:
        app.run(host='0.0.0.0', port=5005)
    finally:
        # Set the worker_running flag to False to stop the worker thread
        worker_running = False
        if worker_thread.is_alive():
            worker_thread.join(timeout=5)




