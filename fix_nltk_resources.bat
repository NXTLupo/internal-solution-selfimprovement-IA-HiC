@echo off
echo Fixing NLTK resources for Social Research Analytics backend...
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    exit /b 1
)

REM Step 1: Download all required NLTK resources
echo Step 1: Installing required NLTK resources...
docker compose -f docker-compose-all.yml exec social-research-backend bash -c "python -c 'import nltk; print(\"Installing NLTK resources...\"); nltk.download(\"punkt\"); nltk.download(\"punkt_tab\"); nltk.download(\"stopwords\"); nltk.download(\"wordnet\"); nltk.download(\"omw-1.4\"); print(\"Done!\")'"

REM Step 2: Install unzip if needed and extract ZIP files
echo.
echo Step 2: Installing unzip and extracting packages...
docker compose -f docker-compose-all.yml exec social-research-backend bash -c "apt-get update && apt-get install -y unzip && cd /root/nltk_data/corpora && unzip -o -q wordnet.zip && unzip -o -q omw-1.4.zip"

REM Step 3: Verify all resources are available
echo.
echo Step 3: Verifying all NLTK resources...
docker compose -f docker-compose-all.yml exec social-research-backend python -c "import nltk.data; resources = {'punkt': 'tokenizers/punkt', 'punkt_tab': 'tokenizers/punkt_tab', 'stopwords': 'corpora/stopwords', 'wordnet': 'corpora/wordnet', 'omw-1.4': 'corpora/omw-1.4'}; print('NLTK Resource Status:'); all_available = True; [print(f'{r}: Available' if nltk.data.find(path) else (all_available := False) or f'{r}: Missing') for r, path in resources.items()]; print('\nSUMMARY: ' + ('All resources available!' if all_available else 'Some resources are still missing'))"

REM Step 4: Restart the container to apply changes
echo.
echo Step 4: Restarting Social Research backend container...
docker compose -f docker-compose-all.yml restart social-research-backend

echo.
echo NLTK resources fix complete! The Social Research Analytics app should now work properly.