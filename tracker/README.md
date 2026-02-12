# tracker

Activity tracking application for macOS that monitors Chrome browser usage with InfluxDB and Grafana visualization.

![screenshot](docs/screenshot.png)

## Overview

An activity tracker written in Go that records application usage data into InfluxDB for visualization in Grafana dashboards. Originally created to experiment with time-series databases and analytics platforms.

## Tech Stack

- **Backend**: Go application monitoring system processes
- **Database**: InfluxDB for time-series data storage
- **Visualization**: Grafana for dashboard creation
- **Platform**: macOS-specific (monitors Chrome browser activity)

## Features

- Tracks application usage time automatically
- Integrates with InfluxDB for data persistence
- Provides Grafana dashboard for data visualization
- Available via Homebrew for easy installation

## Installation

### Homebrew
```bash
brew tap lucapette/tap
brew install tracker
brew services start lucapette/tap/tracker
```

### Manual
Download the latest binary from releases and place in your PATH. Requires InfluxDB running locally.

## Configuration

Currently configured with default settings; customization options are limited. See categories.csv for default activity classifications.

## Limitations

- macOS only (Chrome activity tracking)
- Fixed InfluxDB connection settings
- Limited configuration options
- Small default category set

## License

[MIT](/LICENSE) Copyright (c) [Luca Pette](https://lucapette.me)