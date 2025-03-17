import plivo


from backend.config import PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN
client = plivo.RestClient(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN)

# response = client.calls.get(call_uuid='feaa0382-db2f-404b-a584-4175a451ffc9', )
response = client.live_calls.get('feaa0382-db2f-404b-a584-4175a451ffc9')
print(response)
print(response)
