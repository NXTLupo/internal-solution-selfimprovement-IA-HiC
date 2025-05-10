import yaml
from pathlib import Path
import click


@click.command('az-login')
@click.option('--path', '-p', type=click.Path(exists=True), default=Path.home() / '.azure', help='Path to the Azure home directory')
@click.pass_obj
def cli(environment, path):
    """log into Azure using the Azure CLI in a docker container. Mounts the artifacts to host so that they can be shared to other containers"""
    
    click.secho("Logging into Azure via Docker container...", fg='green')
    
    # run a docker command to log into Azure
    # mount the artifacts directory to the host so that they can be shared to other containers
    environment.run_on_host(
        f"docker run -it --rm -v {path}:/root/.azure mcr.microsoft.com/azure-cli:cbl-mariner2.0 az login")
    
    click.secho("Azure login complete.", fg='green')
    click.echo("You can now volume mount the Azure home directory to other containers:")
    click.echo(f"volume:\n\t- {path}:/root/.azure")