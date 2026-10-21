"""figkit: webapps that are the interactive counterparts of scientific papers."""

__version__ = "0.1.0.dev0"

from figkit.build import BuildError, BuildResult, build, inline_modules  # noqa: E402
from figkit.data import DataError, Dataset, export, load  # noqa: E402

__all__ = ["BuildError", "BuildResult", "DataError", "Dataset", "__version__", "build", "export",
           "inline_modules", "load"]
