#!/bin/bash
kill $(cat video_analyzer.pid) 2>/dev/null || true
kill $(cat launchpad.pid) 2>/dev/null || true
kill $(cat reddit_ripper.pid) 2>/dev/null || true
kill $(cat journey_mapper.pid) 2>/dev/null || true
rm -f *.pid
echo "All services stopped."
