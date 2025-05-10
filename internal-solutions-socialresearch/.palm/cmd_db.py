import click
from pathlib import Path


@click.command('init-db')
@click.pass_obj
def cli(environment):
    """Initialize the database by running the db_init.py script inside the Docker container"""
    
    click.secho("Initializing database inside Docker container...", fg='green')
    
    # Run the db_init.py script inside the backend container
    environment.run_on_host("docker compose exec backend python -m app.db_init")
    
    click.secho("Database initialization complete.", fg='green')
