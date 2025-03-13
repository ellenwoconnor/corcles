#!/bin/sh
# Only write the CA cert if the environment variable is set
if [ -n "$PG_CA_CERT" ]; then
    echo "$PG_CA_CERT" > /app/ca-certificate.crt
    export SSLROOTCERT=/app/ca-certificate.crt
fi

# Run the main container process
exec "$@"