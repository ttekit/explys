.PHONY: up down logs restart token

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

restart:
	docker compose restart

token:
	node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
