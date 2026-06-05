#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JAVA_DIR="$ROOT_DIR/vendor/opendataloader-pdf/java"
ARTIFACT_DIR="$ROOT_DIR/build/opendataloader"

usage() {
  cat <<'USAGE'
Usage: scripts/build_parser.sh [--skip-tests] [--release-artifacts]

Build the vendored OpenDataLoader PDF parser from repository source.

Options:
  --skip-tests         Pass -DskipTests to Maven.
  --release-artifacts  Enable the upstream release profile.
  -h, --help           Show this help.
USAGE
}

SKIP_TESTS=0
RELEASE_ARTIFACTS=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-tests)
      SKIP_TESTS=1
      shift
      ;;
    --release-artifacts)
      RELEASE_ARTIFACTS=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ ! -d "$JAVA_DIR" ]]; then
  echo "Vendored OpenDataLoader Java source not found: $JAVA_DIR" >&2
  exit 1
fi

if ! command -v java >/dev/null 2>&1 || ! java -version >/dev/null 2>&1; then
  echo "Java runtime not found or not usable. Install Java 11+ before building the vendored parser." >&2
  if [[ -x /opt/homebrew/opt/openjdk/bin/java ]]; then
    echo "Homebrew OpenJDK exists; try: PATH=/opt/homebrew/opt/openjdk/bin:\$PATH scripts/build_parser.sh --skip-tests" >&2
  fi
  exit 1
fi

if ! command -v mvn >/dev/null 2>&1 || ! mvn -version >/dev/null 2>&1; then
  echo "Maven not found or not usable. Install Maven before building the vendored parser." >&2
  exit 1
fi

MAVEN_ARGS=(-B clean package)
if [[ "$RELEASE_ARTIFACTS" -eq 1 ]]; then
  MAVEN_ARGS+=(-P release)
fi
if [[ "$SKIP_TESTS" -eq 1 ]]; then
  MAVEN_ARGS+=(-DskipTests)
fi

(
  cd "$JAVA_DIR"
  mvn "${MAVEN_ARGS[@]}"
)

mkdir -p "$ARTIFACT_DIR"
JAR_PATH="$(find "$JAVA_DIR/opendataloader-pdf-cli/target" -maxdepth 1 -type f -name 'opendataloader-pdf-cli-*.jar' ! -name 'original-*' ! -name '*-sources.jar' ! -name '*-javadoc.jar' | sort | tail -n 1)"

if [[ -z "$JAR_PATH" ]]; then
  echo "Build completed but no parser JAR was found under $JAVA_DIR/opendataloader-pdf-cli/target" >&2
  exit 1
fi

cp "$JAR_PATH" "$ARTIFACT_DIR/opendataloader-pdf-cli.jar"
echo "$ARTIFACT_DIR/opendataloader-pdf-cli.jar"
