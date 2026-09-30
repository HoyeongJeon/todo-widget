using System.Text;

namespace TodoWidget.Core;

/// <summary>임시 파일에 먼저 쓰고 원본과 교체한다. 저장 중 전원이 꺼져도 원본이 깨지지 않는다.</summary>
internal static class AtomicFile
{
    public static void WriteAllText(string path, string content)
    {
        var fullPath = Path.GetFullPath(path);
        Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

        var temp = fullPath + ".tmp";
        using (var stream = new FileStream(temp, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            var bytes = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false).GetBytes(content);
            stream.Write(bytes);
            // 내용이 디스크에 실제로 기록된 뒤에 교체해야 정전 후에도 빈 파일이 남지 않는다.
            stream.Flush(flushToDisk: true);
        }
        File.Move(temp, fullPath, overwrite: true);
    }
}
