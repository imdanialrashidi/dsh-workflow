# Shared by install.sh and init-project.sh. Caller supplies die() and absolute paths.
write_lock=""
stage=""

cleanup_write() {
  if [ -n "$stage" ]; then rm -f "$stage"; fi
  if [ -n "$write_lock" ]; then rmdir "$write_lock"; fi
}

begin_write() {
  local candidate="$1/.dsh-workflow-write.lock"
  mkdir -p "$1" || die "could not create $1"
  if ! mkdir "$candidate" 2>/dev/null; then
    die "cannot acquire $candidate (check for an active writer, existing lock or permission error)"
  fi
  write_lock="$candidate"
  trap cleanup_write EXIT
  trap 'exit 129' HUP
  trap 'exit 130' INT
  trap 'exit 143' TERM
}

stage_file() {
  local parent="${2%/*}"
  mkdir -p "$parent" || die "could not create $parent"
  stage="$(mktemp "$parent/.dsh-stage.XXXXXX")" || die "could not stage $2"
  cp -p "$1" "$stage" || die "could not stage $2"
}

publish_new() {
  # Both workflow writers hold the same root lock. The additional no-clobber
  # check preserves a file that has appeared in the meantime.
  mv -n "$stage" "$1" && [ ! -e "$stage" ] || die "could not create $1 without overwriting"
  stage=""
}
