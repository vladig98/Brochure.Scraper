namespace Brochure.Scraper.Server.RegexPatterns.Fantastico;

public static partial class FantasticoRegex
{
    [GeneratedRegex(@"\d+(?=\.xml)")]
    public static partial Regex PageRegex { get; }

    [GeneratedRegex(@"\d{1,}\.{0,}\d{0,}")]
    public static partial Regex DigitRegex { get; }

    [GeneratedRegex(@"\d+\.\d{2}")]
    public static partial Regex PriceRegex { get; }

    [GeneratedRegex(@"(\d{2}\.\d{2}\.\d{4})")]
    public static partial Regex DatesRegex { get; }
}
