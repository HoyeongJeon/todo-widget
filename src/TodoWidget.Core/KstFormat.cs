using System.Globalization;

namespace TodoWidget.Core;

/// <summary>저장용 시각 문자열 형식. 예: 2026-09-30 14:05:00</summary>
public static class KstFormat
{
    public const string Pattern = "yyyy-MM-dd HH:mm:ss";

    public static string Format(DateTime value) => value.ToString(Pattern, CultureInfo.InvariantCulture);

    public static bool TryParse(string? text, out DateTime value) =>
        DateTime.TryParseExact(text, Pattern, CultureInfo.InvariantCulture, DateTimeStyles.None, out value);
}
