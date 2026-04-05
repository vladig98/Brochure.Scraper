namespace Brochure.Scraper.Server.Dtos;

public readonly record struct PriceInfo(
    string CurrentPriceBgn,
    string OldPriceBgn,
    string UnitPriceBgn,
    string CurrentPriceEur,
    string OldPriceEur,
    string UnitPriceEur,
    string Discount
);
