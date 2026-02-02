# AGENTS.md - Coding Agent Guidelines

This document provides guidelines for AI coding agents working in the `meshcore-mqtt` repository. This is a MeshCore to MQTT bridge that supports sending data over MQTT, and accepting incoming commands to be sent to the MeshCore radio. This softare acts as a [Companion Radio Protocol](https://github.com/meshcore-dev/MeshCore/wiki/Companion-Radio-Protocol) for MeshCore.

## Project Overview

- **Purpose**: Broadcast messages from a MeshCore radio, to a MQTT topic.
- **Tech Stack**: TypeScript and Vitest.
- **Node.js Version**: 24 LTS.

## Test Instructions

- For details about the CI pipeline, look in the `.github/workflows` folder.
- Tests can be run by executing: `pnpm test`. The commit should pass all tests before its ready for review.
- Fix any tests or typing issues until the whole test suite passes.
- Always add or update tests for the code you change, there should be no exceptions.
- Tests should be simple to understand, and achieve highest coverage possible.
