# Plivo Call API Documentation

This document explains how to use the Plivo Call API. You can use this API to get details about your call records.

## Request

### HTTP Method
```
GET
```

### Endpoint URL
```
https://api.plivo.com/v1/Account/{AUTH_ID}/Call/
```
Replace `{AUTH_ID}` with your actual authentication ID.

### Authentication

You must use basic authentication with your `AUTH_ID` and `AUTH_TOKEN`.

### cURL Example

```bash
curl -i --user AUTH_ID:AUTH_TOKEN \
  https://api.plivo.com/v1/Account/{AUTH_ID}/Call/
```

## Response

When the request is successful, you will get an HTTP status code `200` along with a JSON response.

### JSON Structure

- **api_id**: Unique identifier for the API request.
- **meta**: Contains pagination details.
  - **limit**: Maximum number of records per page.
  - **next**: URL for the next page (null if none).
  - **offset**: Position of the current page.
  - **previous**: URL for the previous page (null if none).
  - **total_count**: Total number of call records.
- **objects**: List of call details. Each call object has:
  - **answer_time**: Time when the call was answered.
  - **api_id**: Unique identifier for the call.
  - **bill_duration**: Duration billed (in seconds).
  - **billed_duration**: Actual billed duration.
  - **call_direction**: Direction of the call (e.g., outbound).
  - **call_duration**: Total duration of the call (in seconds).
  - **call_state**: Status of the call (e.g., ANSWER).
  - **call_uuid**: Unique identifier for the call.
  - **conference_uuid**: Conference identifier (if any).
  - **end_time**: Time when the call ended.
  - **from_number**: Caller’s phone number.
  - **hangup_cause_code**: Code showing why the call was hung up.
  - **hangup_cause_name**: Name describing the hangup cause.
  - **hangup_source**: Source of the error during hangup.
  - **initiation_time**: Time when the call started.
  - **parent_call_uuid**: Identifier for the parent call (if any).
  - **resource_uri**: URI to access call details.
  - **stir_verification**: STIR verification status.
  - **to_number**: Receiver's phone number or SIP address.
  - **total_amount**: Total cost of the call.
  - **total_rate**: Rate charged for the call.
  - **Stir_attestation**: Attestation status.
  - **voice_network_group**: Group information for the voice network.
  - **source_ip**: IP address from where the call was made.

### Example Response

```json
{
  "api_id": "8299d094-dc72-11e5-b56c-22000ae90795",
  "meta": {
    "limit": 20,
    "next": null,
    "offset": 0,
    "previous": null,
    "total_count": 4
  },
  "objects": [
    {
      "answer_time": "2022-10-12 21:57:47+05:30",
      "api_id": "52cd2e1d-2bfd-11ec-a7bd-0242ac110005",
      "bill_duration": 1,
      "billed_duration": 1,
      "call_direction": "outbound",
      "call_duration": 1,
      "call_state": "ANSWER",
      "call_uuid": "5607532d-5037-4066-befc-a8b40218dd4f",
      "conference_uuid": null,
      "end_time": "2022-10-12 21:57:47+05:30",
      "from_number": "+12025551111",
      "hangup_cause_code": 8011,
      "hangup_cause_name": "Invalid Answer XML",
      "hangup_source": "Error",
      "initiation_time": "2022-10-12 21:57:40+05:30",
      "parent_call_uuid": null,
      "resource_uri": "/v1/Account/MA2025RK4E639VJFZAGV/Call/5607532d-5037-4066-befc-a8b40218dd4f/",
      "stir_verification": "Not Applicable",
      "to_number": "sip:sam9461399937766203278@phone.plivo.com",
      "total_amount": "0.01667",
      "total_rate": "1.00000",
      "Stir_attestation": "A",
      "voice_network_group": "",
      "source_ip": "92.168.0.1"
    }
  ]
}
```

## Important Notes

- The API returns the response in JSON format.
- If there are no more records to show, the `next` and `previous` fields will be `null`.
- Always use correct and valid authentication credentials (i.e., `AUTH_ID` and `AUTH_TOKEN`) to avoid any errors.

