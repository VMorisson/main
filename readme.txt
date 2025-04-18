Fly, à installer depuis un bash (unbuntu par exemple)
curl -L https://fly.io/install.sh | sh //pour installer fly.io sur le serveur
puis
export FLYCTL_INSTALL="$HOME/.fly"
export PATH="$FLYCTL_INSTALL/bin:$PATH"