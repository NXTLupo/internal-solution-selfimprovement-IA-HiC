# Brand fonts for the renderer

Drop the brand font files here (Saira Condensed, Archivo, IBM Plex Mono for NXT; Lato
for NU) and the image runs `fc-cache` over them at build time, so a composition can name
them instead of falling back to a system face.

This file exists because git does not track empty directories, and the Dockerfile has a
`COPY fonts/` step. Without a tracked file in here, a fresh clone fails the build with
"no source files were specified" before it reaches anything interesting.

Google Fonts still resolves at compile time for faces that are not here, so an empty
directory is a fallback rather than a failure. Vendor the files when the renderer must
work with no outbound network.
