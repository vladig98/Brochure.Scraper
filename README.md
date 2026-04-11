# Brochure Scraper

A high-performance .NET Web API designed to aggregate product data and pricing from major Bulgarian retail chains. The system uses a variety of scraping techniques—from direct API consumption and CSV parsing to browser automation—to provide a unified data source for retail promotions.

## 🚀 Overview

The **Brochure Scraper** automates the collection of promotional items from the following retailers:
* **Billa** (CSV parsing)
* **Lidl** (JSON API)
* **Kaufland** (JSON API)
* **Metro** (Hierarchical category crawling & JSON API)
* **Fantastico** (Playwright browser automation & internal API interception)

The results are aggregated, deduplicated, and exported as a `products.json` file for use by client-side applications.

## 🏗️ Architecture

- **Worker/Service Layer**: A centralized `ProductsAggregator` manages the lifecycle of the scraping process.
- **Concurrency**: Scrapers run in parallel using `Task.WhenEach` for maximum efficiency.
- **Abstraction**: All scrapers implement a common `IScraper` interface, registered via Keyed Singletons for clean dependency injection.
- **Headless Automation**: Utilizes Microsoft Playwright to handle retailers with complex, client-side rendered brochures.

## 🛠️ Technology Stack

- **Backend**: .NET 8 / ASP.NET Core
- **Automation**: [Microsoft Playwright](https://playwright.dev/dotnet/)
- **Documentation**: [Scalar](https://github.com/scalar/scalar) & OpenAPI (Swagger)
- **Serialization**: System.Text.Json

## 📥 Installation & Setup

### Prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Playwright Browsers](https://playwright.dev/dotnet/docs/intro#installing-playwright)

### Local Development
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/brochure-scraper.git](https://github.com/your-username/brochure-scraper.git)
   cd brochure-scraper
   ```

2. **Install Playwright dependencies:**
   ```bash
   pwsh bin/Debug/net8.0/playwright.ps1 install
   ```

3. **Run the application:**
   ```bash
   dotnet run --project Brochure.Scraper.Server
   ```

## ⚙️ How It Works

1. **Discovery**: The `ProductsAggregator` resolves all registered `IScraper` instances.
2. **Execution**: Scrapers execute concurrently. Some (like Metro) perform a multi-stage crawl to discover categories before fetching products.
3. **Serialization**: Once all tasks complete, the `products.json` file is written to the `public` directory of the client project.
4. **Auto-Termination**: The server is designed to perform its task and then gracefully exit (`IHostApplicationLifetime.StopApplication`), making it ideal for scheduled cron jobs or CI/CD pipelines.

## 📊 API Endpoints

- `GET /products`: Triggers the manual aggregation process.
- `GET /openapi/v1.json`: Access the OpenAPI specification.
- `/scalar/v1`: Interactive API documentation.

## 📝 License

This project is licensed under the MIT License.