import requests
import json
import time

def send_message(message, delay=1.5):
    """
    Sends a message to the paste server
    
    Args:
        message (str): The message to send
        delay (float): Delay between chunks in seconds
    
    Returns:
        Response object from the server
    """
    url = "http://localhost:5005/paste"
    payload = {
        "message": message,
        "delay": delay
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    response = requests.post(url, data=json.dumps(payload), headers=headers)
    return response

if __name__ == "__main__":
    print("Message Pasting Server Test Client")
    print("==================================")
    
    # Sample message to test
    test_message = input("Enter your message (or press Enter for default test message): ")
    
    if not test_message:
        test_message = "This is a test message that will be split into chunks if it's long enough. The server will paste each chunk with a delay between them."
    
    delay = input("Enter delay between chunks in seconds (or press Enter for default 1.5s): ")
    delay = float(delay) if delay else 1.5
    
    print(f"\nSending message with {delay}s delay between chunks...")
    print("Switch to the window where you want the text pasted!")
    time.sleep(2)
    
    try:
        response = send_message(test_message, delay)
        print(f"\nServer response: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
    except requests.exceptions.ConnectionError:
        print("\nERROR: Could not connect to the server. Make sure it's running on http://localhost:5005")
    except Exception as e:
        print(f"\nERROR: {str(e)}") 


