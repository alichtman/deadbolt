# Modified from: https://github.com/mklement0/fileicon/blob/master/bin/fileicon

pngIconFile="$1"
fileThatWillBecomeIconic="$2"

# !! Sadly, Apple decided to remove the `-i` / `--addicon` option from the `sips` utility.
# !! Therefore, use of *Cocoa* is required, which we do *via Python*, which has the added advantage
# !! of creating a *set* of icons from the source image, scaling as necessary to create a
# !! 512 x 512 top resolution icon (whereas sips -i created a single, 128 x 128 icon).
# !! Thanks, https://apple.stackexchange.com/a/161984/28668
# !!
# !! Note: setIcon_forFile_options_() seemingly always indicates True, even with invalid image files, so
# !!       we attempt no error handling in the Python code.

# /usr/bin/python - "$pngIconFile" "$fileThatWillBecomeIconic" <<'EOF' || return
# import Cocoa
# import sys
# Cocoa.NSWorkspace.sharedWorkspace().setIcon_forFile_options_(Cocoa.NSImage.alloc().initWithContentsOfFile_(sys.argv[1].decode('utf-8')), sys.argv[2].decode('utf-8'), 0)
# EOF

/usr/bin/python -c "import Cocoa;import sys;Cocoa.NSWorkspace.sharedWorkspace().setIcon_forFile_options_(Cocoa.NSImage.alloc().initWithContentsOfFile_(\"$pngIconFile\".decode('utf-8')), \"$fileThatWillBecomeIconic\".decode('utf-8'), 0)"
