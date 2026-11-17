# PowerGIS SCADA Integration — V3.2

The application distinguishes operational telemetry from simulator telemetry at database level.

## Supported integration boundary
The frontend does not implement IEC-104, Modbus TCP, MQTT or physical switching directly. A trusted SCADA gateway/service must ingest validated data and write it using authenticated server-side credentials.

## Telemetry provenance
Every telemetry record must carry source type and quality. `SIMULATOR` data is never presented as `OPERATIONAL` data.

## Alarms
`scada_alarms` stores source, severity, status and acknowledgement metadata.

## Switching
Remote breaker/switch control remains disabled. The web UI cannot be used as a physical switching command channel.
