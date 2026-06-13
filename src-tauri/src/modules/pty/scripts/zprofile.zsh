# backsteros-shell-integration (zprofile)
#
# See zshenv.zsh for the rationale on the trailing `:`.
{
  _backsteros_user_zdotdir="${BACKSTEROS_USER_ZDOTDIR:-$HOME}"
  [ -f "$_backsteros_user_zdotdir/.zprofile" ] && source "$_backsteros_user_zdotdir/.zprofile"
  unset _backsteros_user_zdotdir
}
:
