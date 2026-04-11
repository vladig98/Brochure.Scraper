# Deal Aggregator FE

An ultra-optimized .NET-backed React frontend for tracking, filtering, and cost-optimizing grocery deals across major Bulgarian retailers.

## Key Features

* Multi-Store Aggregation: Unified interface for Kaufland, Lidl, Billa, Metro, and Fantastico.
* Logistics Optimization Engine:
    * Route Circuit Logic: Calculates fuel overhead based on a Home -> Shop A -> Shop B -> Home chain rather than redundant round trips.
    * Vehicle Persistence: Stores consumption (L/100km) and coordinates in LocalStorage for zero-setup return sessions.
    * Real-time Cost Analysis: Dynamically calculates if a deal is actually a "deal" after accounting for travel overhead.
* High-Performance UI:
    * Dual-Pane Desktop Layout: Independent scrolling for the product grid and the basket sidebar.
    * Mobile-First Responsive Design: Slide-over basket drawer with high-contrast brand styling.
    * Interactive Store Mapping: Map-based coordinate selection for precise distance calculations.

## Tech Stack

* Framework: React 18 + TypeScript
* Styling: Tailwind CSS (Performance-first utility classes)
* Icons: Lucide React
* State Management: React Context API + LocalStorage Sync
* Optimization: Haversine formula for geospatial distance calculation.

### Project Structure

```text
src/
├── components/
│   ├── BasketSidebar.tsx       # Optimization summary & item management
│   ├── BasketItem.tsx          # Refactored high-hierarchy item rows
│   ├── VehicleWizard.tsx       # UI for fuel consumption settings
│   └── StoreMapModal.tsx       # Leaflet/Map interface for store pins
├── context/
│   └── OptimizationContext.tsx # Centralized state for vehicle, fuel, & pins
├── utils/
│   └── geo.ts                  # getDistanceKm logic
└── types.ts                    # Strict typing for Scrapers and Products
```

## Optimization Logic (The Circuit Fix)

The application solves the over-calculation of fuel costs by grouping unique store visits into a single trip sequence. Instead of separate round trips, it calculates the sequence:

TotalKm = Distance(Home to S1) + Distance(S1 to S2) + ... + Distance(Sn to Home)

This ensures that shopping at multiple retailers in the same vicinity (e.g., a retail park) correctly calculates as near-zero additional travel overhead.

## Setup

1. Install Dependencies:
   npm install
2. Add tslib (if missing):
   npm install tslib
3. Run Development:
   npm run dev

## Exporting
The Export Shopping List feature generates a grouped Markdown-compatible .txt file, organized by store with functional checkboxes for mobile note-taking apps.