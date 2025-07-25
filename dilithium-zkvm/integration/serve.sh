#!/bin/bash
echo "Opening test page in your default browser..."
python3 -m http.server 8000 &
echo "Test page available at: http://localhost:8000/test.html"
echo "Press Ctrl+C to stop the server"
