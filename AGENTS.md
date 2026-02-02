# AGENTS.md - Coding Agent Guidelines

This document provides guidelines for AI coding agents working in the `meshcore-mqtt` repository. This is a MeshCore to MQTT bridge that supports sending data over MQTT, and accepting incoming commands to be sent to the MeshCore radio. This softare acts as a [Companion Radio Protocol](https://github.com/meshcore-dev/MeshCore/wiki/Companion-Radio-Protocol) for MeshCore.

## Project Overview

- **Purpose**: Broadcast messages from a MeshCore radio, to a MQTT topic.
- **Tech Stack**: TypeScript and Vitest.
- **Node.js Version**: 24 LTS.
