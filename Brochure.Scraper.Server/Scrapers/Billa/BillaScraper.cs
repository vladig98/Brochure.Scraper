namespace Brochure.Scraper.Server.Scrapers.Billa;

public class BillaScraper(HttpClient client, ILogger<BillaScraper> logger) : IScraper
{
    private const string _csvUrl = "https://euro.b-ss.eu/csv/billa.csv";

    public async Task<ICollection<Product>> FetchProductsAsync(CancellationToken cancellationToken = default)
    {
        List<Product> allOffers = [];
        DateTime now = DateTime.UtcNow;

        try
        {
            byte[] bytes = await client.GetByteArrayAsync(_csvUrl, cancellationToken);
            string content = Encoding.UTF8.GetString(bytes);

            string[] lines = content.Split(['\n', '\r'], StringSplitOptions.RemoveEmptyEntries);
            string[] headers = lines is { Length: > 0 } ? BillaRegex.CsvRegex.Split(lines[0]) : [];

            HashSet<BillaProduct> billaProducts = [];
            for (int i = 1; i < lines.Length; i++)
            {
                string line = lines[i];
                string[] columns = [.. BillaRegex.CsvRegex.Split(line).Select(x => x.Replace("\"", ""))];

                if (columns is not { Length: 9 })
                {
                    logger.LogError("Skipping malformed line: {Line}", line);
                    continue;
                }

                BillaProduct product = new
                (
                    LocationCode: columns[0],
                    StoreAddress: columns[1],
                    ProductName: columns[2],
                    ProductCode: columns[3],
                    CategoryCode: columns[4],
                    PriceEur: ParseDecimal(columns[5]),
                    DiscountedPriceEur: ParseDecimal(columns[6]),
                    DiscountEndDate: ParseDate(columns[7]),
                    DiscountPercentage: columns[8]
                );

                billaProducts.Add(product);
            }

            IEnumerable<Product> products = billaProducts.Select(x => x.MapToProduct(now));
            allOffers.AddRange(products);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Can't scrape Billa.");
        }

        List<Product> offers = [.. allOffers.Distinct()];
        if (logger.IsEnabled(LogLevel.Information))
        {
            logger.LogInformation("Billa successfully scraped {Count} products", offers.Count);
        }
        
        return offers;
    }

    private static decimal ParseDecimal(string text)
    {
        return decimal.TryParse(text, CultureInfo.InvariantCulture, out decimal value) ? value : 0;
    }

    private static DateTime ParseDate(string text)
    {
        return DateTime.TryParse(text, out DateTime value) ? value : DateTime.MaxValue;
    }
}
