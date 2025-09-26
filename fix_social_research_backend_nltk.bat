@echo off
echo Fixing NLTK punkt_tab issue in Social Research Backend...
echo.

echo Downloading missing NLTK resource punkt_tab...
docker compose -f docker-compose-all.yml exec social-research-backend bash -c "python -m nltk.downloader punkt_tab"

echo.
echo Restarting Social Research Backend container...
docker compose -f docker-compose-all.yml restart social-research-backend

echo.
echo Fix complete! The Social Research app should now work properly.
echo If issues persist, try running these additional NLTK downloads:
echo docker compose -f docker-compose-all.yml exec social-research-backend bash -c "python -m nltk.downloader punkt stopwords wordnet omw-1.4"