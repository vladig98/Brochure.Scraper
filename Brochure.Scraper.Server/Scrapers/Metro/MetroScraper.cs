namespace Brochure.Scraper.Server.Scrapers.Metro;

public class MetroScraper(HttpClient client, ILogger<MetroScraper> logger) : IScraper
{
    private const string _productsIdsByCategoryUrl = "https://shop.metro.bg/searchdiscover/articlesearch/search?storeId=00010&language=bg-BG&country=BG&query=*&rows=1000";
    private const string _productDataUrl = "https://shop.metro.bg/evaluate.article.v1/betty-variants?storeIds=00010&country=BG&locale=bg-BG";
    private const int _maxApiLimit = 3_000;
    private readonly JsonSerializerOptions _jsonSerializerOptions = new() { PropertyNameCaseInsensitive = true };
    private readonly SemaphoreSlim _semaphore = new(10);
    private readonly ConcurrentQueue<string> _uniqueProductIds = [];
    private readonly ConcurrentQueue<string> _rawProductJsonData = [];

    public async Task<ICollection<Product>> FetchProductsAsync(CancellationToken ct = default)
    {
        await RunDiscoveryPhase(ct);

        string[] allIds = [.. _uniqueProductIds.Distinct()];
        IEnumerable<string[]> batches = allIds.Chunk(20);

        IEnumerable<Task> extractionTasks = batches.Select(async batch =>
        {
            await _semaphore.WaitAsync(ct);
            try
            {
                string fullUrl = BuildProductsUrl(batch);
                string jsonResponse = await client.GetStringAsync(fullUrl, ct);

                if (!string.IsNullOrWhiteSpace(jsonResponse))
                {
                    _rawProductJsonData.Enqueue(jsonResponse);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to evaluate batch of {Count} items.", batch.Length);
            }
            finally
            {
                _semaphore.Release();
            }
        });

        await Task.WhenAll(extractionTasks);
        ICollection<Product> data = Parse(_rawProductJsonData);

        return [.. data.Distinct()];
    }

    private static string BuildProductsUrl(string[] batch)
    {
        StringBuilder urlBuilder = new(_productDataUrl);
        foreach (string id in batch)
        {
            urlBuilder.Append($"&ids={Uri.EscapeDataString(id)}");
        }

        urlBuilder.Append($"&__t={DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}");

        return urlBuilder.ToString();
    }

    public ICollection<Product> Parse(ConcurrentQueue<string> rawJsonBag)
    {
        List<MetroProductResponse> responses = [];

        foreach (string json in rawJsonBag)
        {
            try
            {
                MetroProductResponse? response = JsonSerializer.Deserialize<MetroProductResponse>(json, _jsonSerializerOptions);
                if (response is null)
                {
                    logger.LogError("Failed parsing json {Json}", json);
                    continue;
                }

                response = response with { Json = json };
                responses.Add(response);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error parsing a JSON batch from Metro bag.");
            }
        }

        List<Product> products = [.. responses
            .SelectMany(x => x.Result.Values)
            .SelectMany(x => x.Variants.Values)
            .SelectMany(x => x.Bundles.Values
                .SelectMany(y => y.Stores.Values
                .SelectMany(z => z.PossibleDeliveryModes.Store.PossibleFulfillmentTypes.Store.SellingPriceInfo?.MapToProduct(y) ?? []))
            )];

        List<Product> offers = [.. products.Distinct()];
        if (logger.IsEnabled(LogLevel.Information))
        {
            logger.LogInformation("Metro successfully scraped {Count} products", offers.Count);
        }

        return offers;
    }

    private async Task RunDiscoveryPhase(CancellationToken ct)
    {
        string categoriesUrl = $"{_productsIdsByCategoryUrl}&page=1&categories=true";
        string response = await client.GetStringAsync(categoriesUrl, ct);

        MetroCategoryResponse? parsedResponse = JsonSerializer.Deserialize<MetroCategoryResponse>(response, _jsonSerializerOptions);
        if (parsedResponse is null)
        {
            return;
        }

        HashSet<string> categoryUrls = [];
        ExtractCategoryUrls(parsedResponse.CategoryTree.Children, categoryUrls);

        IEnumerable<Task> discoveryTasks = categoryUrls.Select(async path =>
        {
            int currentPage = 1;
            bool hasMorePages = true;

            while (hasMorePages && !ct.IsCancellationRequested)
            {
                string pagedUrl = $"{_productsIdsByCategoryUrl}&filter=category:{Uri.EscapeDataString(path)}&page={currentPage}";
                string categoryResponse = await client.GetStringAsync(pagedUrl, ct);

                MetroCategoryResponse? category = JsonSerializer.Deserialize<MetroCategoryResponse>(categoryResponse, _jsonSerializerOptions);
                if (category is null)
                {
                    logger.LogError("Failed getting data for category {Category}", path);
                    break;
                }

                if (category.ResultIds is not { Length: > 0 })
                {
                    logger.LogError("Category {Category} is empty", path);
                    break;
                }

                foreach (string resultId in category.ResultIds)
                {
                    _uniqueProductIds.Enqueue(resultId);
                }

                if (!category.NextPage.HasValue)
                {
                    hasMorePages = false;
                }
                else
                {
                    currentPage = category.NextPage.Value;
                }
            }
        });

        await Task.WhenAll(discoveryTasks);
    }

    private void ExtractCategoryUrls(Dictionary<string, MetroCategoryChild>? children, HashSet<string> categoryUrls)
    {
        if (children is not { Count: > 0 })
        {
            return;
        }

        string[] keys = [.. children.Keys];
        foreach (string key in keys)
        {
            MetroCategoryChild child = children[key];
            ExtractCategoryUrls(child.Children, categoryUrls);

            if (child.Children is not { Count: > 0 })
            {
                if (child.Amounts <= _maxApiLimit)
                {
                    categoryUrls.Add(child.UrlCategoryPath);
                }
                else
                {
                    logger.LogError("Category {Key} exceeds the API limit {Limit} and we can't fetch the products.", key, _maxApiLimit);
                }
            }
        }
    }
}