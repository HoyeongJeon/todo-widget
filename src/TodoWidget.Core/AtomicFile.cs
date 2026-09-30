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
        File.WriteAllText(temp, content, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
        File.Move(temp, fullPath, overwrite: true);
    }
}
