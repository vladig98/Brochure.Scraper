namespace Brochure.Scraper.Server.Dtos;

public readonly record struct Product(
    DateTime DateFrom,
    DateTime DateTo,
    string Title,
    string Subtitle,
    PriceInfo Prices,
    string DetailTitle,
    string DetailDescription,
    string CategoryName,
    string StoreName
);