#!/usr/bin/env python3
import serial
import time
import argparse
import pygame

# Initialize pygame mixer for audio playback
pygame.mixer.init()

# Flag to track if music is currently playing
music_playing = False



def playMusic(music_name):
    """
    Function to greet Julie when triggered by receiving "2" from serial port.
    Plays Brazil.mp3 song from the current directory.
    If called when music is already playing, it stops the music instead.
    """
    global music_playing
    
    if not music_playing:

        
        try:
            print(f"Playing {music_name}...")
            pygame.mixer.music.load("./audio/" + music_name)
            pygame.mixer.music.play()
            music_playing = True
        except Exception as e:
            print(f"Error playing music: {e}")
    else:
        print("Stopping music...")
        pygame.mixer.music.stop()
        music_playing = False

def read_serial(port, baudrate, timeout=1):
    """
    Read data from a serial port and print it.
    
    Args:
        port (str): Serial port name (e.g., '/dev/ttyUSB0', 'COM3')
        baudrate (int): Baud rate for the serial connection
        timeout (float): Read timeout in seconds
    """
    try:
        # Open serial port
        ser = serial.Serial(port, baudrate, timeout=timeout)
        print(f"Connected to {port} at {baudrate} baud")
        
        # Wait for serial connection to establish
        time.sleep(2)
        
        # Clear any initial data
        ser.flushInput()
        
        
        
        # Continuously read and print data
        while True:
            # Check if data is available
            if ser.in_waiting > 0:
                # Read a line (until newline character)
                try:
                    line = ser.readline().decode('utf-8').strip()
                    print(f"Received: {line}")
                    
                    # Check if received data is "2" and call greetJulie()
                    if line == "8":
                        playMusic("./Brazil.mp3")

                    if line == "1":
                        playMusic("./Contre-nature.mp3")

                    if line == "2":
                        playMusic("./La-vie.mp3")

                    if line == "3":
                        playMusic("./Sacree-soiree.mp3")
                        
                except UnicodeDecodeError:
                    # If data can't be decoded as UTF-8, show raw bytes
                    raw_data = ser.readline()
                    print(f"Received (raw): {raw_data}")
            
            # Small delay to reduce CPU usage
            time.sleep(0.01)
            
    except serial.SerialException as e:
        print(f"Error opening serial port: {e}")
    except KeyboardInterrupt:
        print("\nExiting program")
    finally:
        # Close serial port if it's open
        if 'ser' in locals() and ser.is_open:
            ser.close()
            print("Serial connection closed")
        
        # Clean up pygame resources
        pygame.mixer.quit()

if __name__ == "__main__":
    # Command-line argument parsing
    parser = argparse.ArgumentParser(description='Read and print data from a serial port')
    parser.add_argument('port', help='Serial port (e.g., /dev/ttyUSB0, COM3)')
    parser.add_argument('baudrate', type=int, help='Baud rate (e.g., 9600, 115200)')
    parser.add_argument('--timeout', type=float, default=1, help='Read timeout in seconds')
    
    args = parser.parse_args()
    
    # Start reading from the serial port
    read_serial(args.port, args.baudrate, args.timeout)
