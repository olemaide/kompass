# Draws the Kompass mark (3x3 grid, lit center) at several sizes and packs them into kompass.ico.
# The results are committed, so this only needs to run after changing the mark:
#   .\launcher\make-icon.ps1 -PngOut web\public\icon-256.png -LargePngOut launcher\icon-1024.png
param([string]$OutDir = $PSScriptRoot, [string]$PngOut, [string]$LargePngOut)

Add-Type -AssemblyName System.Drawing

function Add-RoundRect($g, $brush, [double]$x, [double]$y, [double]$w, [double]$h, [double]$r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = [Math]::Max(0.5, $r * 2)
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)
    $path.Dispose()
}

function New-IconBitmap([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $s = $size / 64.0

    $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 22, 22, 26))
    Add-RoundRect $g $bg 0 0 $size $size (14 * $s)

    $offsets = @(12, 26.5, 41)
    for ($i = 0; $i -lt 9; $i++) {
        $x = $offsets[$i % 3] * $s
        $y = $offsets[[Math]::Floor($i / 3)] * $s
        if ($i -eq 4) { $color = [System.Drawing.Color]::FromArgb(255, 61, 99, 255) }
        elseif ($i % 2 -eq 1) { $color = [System.Drawing.Color]::FromArgb(158, 242, 242, 243) }
        else { $color = [System.Drawing.Color]::FromArgb(97, 242, 242, 243) }
        $brush = New-Object System.Drawing.SolidBrush $color
        Add-RoundRect $g $brush $x $y (11 * $s) (11 * $s) (2.5 * $s)
        $brush.Dispose()
    }
    $g.Dispose()
    $bg.Dispose()
    return $bmp
}

if ($LargePngOut) {
    # macOS and Linux build their app icons from this one.
    $large = New-IconBitmap 1024
    $large.Save($LargePngOut, [System.Drawing.Imaging.ImageFormat]::Png)
    $large.Dispose()
}

$sizes = 16, 24, 32, 48, 64, 128, 256
$images = foreach ($size in $sizes) {
    $bmp = New-IconBitmap $size
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    if ($size -eq 256 -and $PngOut) { $bmp.Save($PngOut, [System.Drawing.Imaging.ImageFormat]::Png) }
    $bmp.Dispose()
    , $ms.ToArray()
}

# ICO container with PNG-compressed entries (supported since Windows Vista).
$out = New-Object System.IO.MemoryStream
$w = New-Object System.IO.BinaryWriter $out
$w.Write([UInt16]0); $w.Write([UInt16]1); $w.Write([UInt16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $dim = if ($sizes[$i] -ge 256) { 0 } else { $sizes[$i] }
    $w.Write([byte]$dim); $w.Write([byte]$dim); $w.Write([byte]0); $w.Write([byte]0)
    $w.Write([UInt16]1); $w.Write([UInt16]32)
    $w.Write([UInt32]$images[$i].Length); $w.Write([UInt32]$offset)
    $offset += $images[$i].Length
}
foreach ($img in $images) { $w.Write($img) }
$w.Flush()
[System.IO.File]::WriteAllBytes((Join-Path $OutDir 'kompass.ico'), $out.ToArray())
$w.Dispose()
