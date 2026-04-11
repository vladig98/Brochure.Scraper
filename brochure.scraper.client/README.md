# Brochure Scraper Client

A modern, responsive React-based dashboard for browsing and filtering retail promotions aggregated from major Bulgarian supermarket chains. Built with **Vite**, **React**, and **Tailwind CSS**.

## ✨ Features

* **Unified Deal Dashboard**: View promotional items from Kaufland, Lidl, Billa, Metro, and Fantastico in a standardized grid.
* **Dual-Currency Support**: Prices are automatically parsed and displayed in both BGN and EUR for quick comparison.
* **Dynamic Filtering**: 
    * **Store Filter**: Filter deals by specific retail brands using interactive brand-colored pills.
    * **Live Search**: Instant search across titles, subtitles, categories, and descriptions.
* **Smart Pagination**: Efficiently handles large datasets with a clean pagination system (24 items per page).
* **Visual Branding**: Store-specific color schemes and badges (e.g., Red for Kaufland, Blue for Lidl, Yellow for Billa).
* **Responsive Design**: Fully optimized for mobile, tablet, and desktop views.

## 🛠️ Tech Stack

* **Framework**: [React 18](https://react.dev/)
* **Build Tool**: [Vite](https://vitejs.dev/)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)
* **Icons**: [Lucide React](https://lucide.dev/)
* **HTTPS Development**: Automatic ASP.NET Core dev-cert integration for secure local development.

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (Latest LTS)
* [.NET SDK](https://dotnet.microsoft.com/download) (Required for generating local development HTTPS certificates)

### Installation
1.  **Navigate to the client directory**:
    ```bash
    cd brochure.scraper.client
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Start the development server**:
    ```bash
    npm run dev
    ```

## 📂 Configuration & Data Flow

* **Vite Config**: The project is configured with a custom port (`54914`) and automatic HTTPS certificate mapping from the machine's ASP.NET store.
* **Data Source**: By default, the app fetches data from a `products.json` file located in the `public` directory. 
* **Price Logic**: The frontend includes logic to clean and parse varied price formats (handling "лв.", "€", and different decimal separators) to ensure consistent sorting and display.

## 🧪 Development

The application includes a `StrictMode` wrapper and uses `useMemo` for high-performance filtering and sorting of the product list, ensuring the UI remains snappy even with thousands of active deals.