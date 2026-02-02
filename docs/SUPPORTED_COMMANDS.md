# Supported Commands

## Introduction

This document contains a breakdown of all the MeshCore commands supported by the bridge. I typically implement the ones what I require most. Implementation is done manually, reading from the [Companion Radio Protocol wiki page](https://github.com/meshcore-dev/MeshCore/wiki/Companion-Radio-Protocol).

> [!NOTE]
> I will only implement commands if I have the means to test them physically with a radio, as I try to base unit tests from this data - I do not operate a Repeater or Room, so it's likely the bridge will not implement these commands in the meantime.

If there is a command you would like to see implemented, please check the [issues](https://github.com/jackcoble/meshcore-mqtt/issues) to see if integration is planned, or create a new one.

## Commands

| Command                     | Description                                             | Required Fields | Example                                         |
| --------------------------- | ------------------------------------------------------- | --------------- | ----------------------------------------------- |
| `device_query`              | Information about the connected device                  | -               | `{}`                                            |
| `get_battery_and_storage`   | Battery and storage information of the connected device | -               | `{}`                                            |
| `send_channel_text_message` | Send a text message to a channel                        | `text`          | `{"channelIdx": 0, "text": "Hello from MQTT!"}` |

### Issuing these Commands

Commands can be issued to a connected radio via MQTT to `{topic}/command`, where `{topic}` is set to `meshcore` by default. Here are a couple of examples.

#### Send Text Message via Channel

```json
{
    "type": "send_channel_text_message",
    "params": {
        "channelIdx": 0,
        "text": "Hello from MQTT!"
    }
}
```

#### Get Device Info

**Payload**

```json
{
    "type": "device_query"
}
```

**Response**

```json
{
    "code": 13,
    "firmware_ver": 8,
    "max_contacts_div_2": 175,
    "max_channels": 40,
    "ble_pin": 0,
    "firmware_build_date": "23 Jan 2026",
    "manufacturer_model": "Heltec V3",
    "semantic_version": "v1.11.0_dev-3c27132"
}
```
