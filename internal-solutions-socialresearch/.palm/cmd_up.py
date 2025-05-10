import click
from pathlib import Path
import inspect


@click.group()
def cli():
    """up"""
    pass


@cli.command()
@click.option(
    "--daemon",
    "-d",
    is_flag=True,
    default=False,
    show_default=True,
    help="run as daemon",
)
@click.option(
    "--build",
    "-b",
    is_flag=True,
    default=False,
    show_default=True,
    help="build docker image first",
)
@click.pass_obj
def fullstack(environment, daemon:bool, build:bool):
    """Starts the complete dev environment including Chat, Engine, CF Tunnel & Langfuse"""
    common_execute(environment, daemon, build)


@cli.command()
@click.option(
    "--daemon",
    "-d",
    is_flag=True,
    default=False,
    show_default=True,
    help="run as daemon",
)
@click.option(
    "--build",
    "-b",
    is_flag=True,
    default=False,
    show_default=True,
    help="build docker image first",
)
@click.pass_obj
def chat(environment, daemon:bool, build:bool):
    """Starts the chat dev environment with Chat, CF Tunnel & Langfuse"""
    common_execute(environment, daemon, build)

@cli.command()
@click.option(
    "--daemon",
    "-d",
    is_flag=True,
    default=False,
    show_default=True,
    help="run as daemon",
)
@click.option(
    "--build",
    "-b",
    is_flag=True,
    default=False,
    show_default=True,
    help="build docker image first",
)
@click.pass_obj
def infra(environment, daemon:bool, build:bool):
    """Starts the skypilot environment"""
    skypath = Path.home() / ".sky"
    if not skypath.is_dir():
        #TODO: document this and echo a link to the docs
        click.echo("~/.sky/ does not exist, please get the config from S3")
        return
    click.echo("setting up aws cloud credentials...")
    environment.run_on_host("aws sso login")
    common_execute(environment, daemon, build)

@cli.command()
@click.option(
    "--daemon",
    "-d",
    is_flag=True,
    default=False,
    show_default=True,
    help="run as daemon",
)
@click.option(
    "--build",
    "-b",
    is_flag=True,
    default=False,
    show_default=True,
    help="build docker image first",
)
@click.pass_obj
def science(environment, daemon:bool, build:bool):
    """Starts the ML development environment with Doctor & Langfuse"""
    common_execute(environment, daemon, build)

@cli.command()
@click.option(
    "--daemon",
    "-d",
    is_flag=True,
    default=False,
    show_default=True,
    help="run as daemon",
)
@click.option(
    "--build",
    "-b",
    is_flag=True,
    default=False,
    show_default=True,
    help="build docker image first",
)
@click.pass_obj
def aws(environment, daemon:bool, build:bool):
    """Starts the connection to RDS dev and prod databases via PGAdmin"""
    common_execute(environment, daemon, build)

def common_execute(environment, daemon, build:bool):
    profile = inspect.stack()[1].function
    if build:
        click.echo("building images...")
        environment.run_on_host(f"docker compose --profile {profile} build")
    environment.run_on_host(
        f"docker compose --profile {profile} up {'-d' if daemon else ''}")


    #click.echo("setting git sha...")
    #environment.run_on_host("git rev-parse HEAD > app/sha.txt")
    #click.echo("set. starting local services...")