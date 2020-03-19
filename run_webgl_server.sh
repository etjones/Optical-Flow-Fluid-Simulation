# Serve this web page
python -m http.server 80 --directory . &
# Also run a mqtt server
/usr/local/sbin/mosquitto -c ./mosquitto.conf