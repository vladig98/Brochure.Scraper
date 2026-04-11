# Brochure Scraper Server

The backend of the Brochure Scraper is a .NET 8 Web API responsible for the core logic of data extraction, aggregation, and serialization. It orchestrates multiple scraper services to collect retail data from various sources.

## ⚙️ Features

- **Multi-Source Scraping**: Support for Billa, Lidl, Kaufland, Metro, and Fantastico.
- **Concurrent Execution**: Uses asynchronous programming to run scrapers in parallel.
- **Data Standardization**: Normalizes diverse retailer data into a unified `Product` schema.
- **Automated Lifecycle**: Configured to run the aggregation process and shut down upon completion (ideal for scheduled tasks).

## 🛠️ Project Structure

- **`Scrapers/`**: Contains retailer-specific implementations of `IScraper`.
- **`Services/`**: Includes `ProductsAggregator` which handles the execution flow.
- **`Dtos/`**: Data Transfer Objects for parsing JSON and CSV responses.
- **`RegexPatterns/`**: Centralized regex logic for cleaning and extracting data from strings.

## 🚀 Getting Started

1. **Configure Environment**:
   Ensure [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) is installed.

2. **Install Playwright**:
   The Fantastico scraper requires Playwright browsers:
   ```bash
   pwsh bin/Debug/net8.0/playwright.ps1 install
   ```

3. **Run**:
   ```bash
   dotnet run
   ```

## 📊 API Reference

The server includes **Scalar** for interactive documentation:
- **UI**: `/scalar/v1`
- **Spec**: `/openapi/v1.json`