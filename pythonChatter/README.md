# Message Pasting Server

A simple Flask HTTP server that receives text messages via POST requests, chunks them if necessary, and pastes them into the active window using pyperclip and pyautogui.

## Setup

1. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Run the server:
   ```
   python clickerServer.py
   ```

3. When you start the server, you'll have 5 seconds to switch to the window where you want the text to be pasted.

## Usage

Send a POST request to `http://localhost:5000/paste` with a JSON body containing your message:

```json
{
  "message": "Your message goes here. It will be automatically chunked if it's too long.",
  "delay": 1.5
}
```

### Parameters

- `message` (required): The text message you want to paste
- `delay` (optional): Time in seconds to wait between pasting chunks (default: 1.5)

### Response

The server will respond with a JSON object:

```json
{
  "success": true,
  "chunks": 2,
  "message": "All chunks pasted successfully"
}
```

## How it works

1. The server receives your message
2. It divides the message into chunks of at most 100 characters, respecting word boundaries
3. Each chunk is formatted with a counter (e.g., "This is chunk 1/3")
4. The server uses pyperclip to copy each chunk to the clipboard
5. It then uses pyautogui to paste the text and press enter
6. It waits for the specified delay before processing the next chunk

## Note

This server uses pyautogui to control your mouse and keyboard. Ensure you have permissions to do this on your system.
For macOS users, you may need to grant accessibility permissions in System Preferences > Security & Privacy > Privacy > Accessibility. 