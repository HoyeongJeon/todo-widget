namespace TodoWidget.Core;

/// <summary>PC 시간대 설정과 관계없이 항상 한국 표준시를 돌려준다.</summary>
public sealed class KstClock : IClock
{
    private static readonly TimeZoneInfo Kst = TimeZoneInfo.FindSystemTimeZoneById("Korea Standard Time");

    private readonly Func<DateTime> _utcNow;

    public KstClock() : this(() => DateTime.UtcNow)
    {
    }

    public KstClock(Func<DateTime> utcNow) => _utcNow = utcNow;

    public DateTime Now
    {
        get
        {
            var kst = TimeZoneInfo.ConvertTimeFromUtc(_utcNow(), Kst);
            // 저장 형식이 초 단위이므로 그 아래는 버린다.
            return new DateTime(kst.Year, kst.Month, kst.Day, kst.Hour, kst.Minute, kst.Second, DateTimeKind.Unspecified);
        }
    }
}
