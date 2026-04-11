# Brochure Scraper Server

The backend of the Brochure Scraper is a .NET 9 Web API responsible for the core logic of data extraction, aggregation, and serialization. It orchestrates multiple scraper services to collect retail data and real-time fuel metrics.

## Features

- Support for Billa, Lidl, Kaufland, Metro, and Fantastico scrapers.
- Retrieves live A95, Diesel, and LPG prices for logistics overhead.
- Uses asynchronous programming to run scrapers in parallel.
- Normalizes diverse retailer data into a unified Product schema.
- Configured to run the aggregation process and shut down upon completion.

## Project Structure

- Scrapers: Retailer-specific implementations of IScraper.
- Services: Includes ProductsAggregator and FuelPriceService.
- Dtos: Data Transfer Objects for JSON and CSV parsing.
- Models: Unified Product and Fuel schemas.
- RegexPatterns: Centralized regex logic for data extraction.

## Getting Started

1. Configure Environment:
Ensure .NET 9 SDK is installed.

2. Install Playwright:
The Fantastico scraper requires Playwright browsers. Run:

```bash
pwsh bin/Debug/net9.0/playwright.ps1 install
```

3. Run the Application:
Execute the following command in the root directory:

```bash
dotnet run
```

## API Reference

The server includes Scalar for interactive documentation:
- UI: /scalar/v1
- Spec: /openapi/v1.json

## Data Flow

1. Scrape: Background workers pull raw promo data from retailers.
2. Fuel Fetch: Service retrieves latest A95 rates for the logistics engine.
3. Normalize: Data is cleaned and currency formats are standardized.
4. Serialize: Produces the final products.json consumed by the frontend.