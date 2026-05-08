package database

import (
	"log/slog"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

func InitDB(connStr string) *sqlx.DB {
	db, err := sqlx.Connect("postgres", connStr)
	if err != nil {
		slog.Error("error connecting to database", "error", err)
		panic(err)
	}

	if err = db.Ping(); err != nil {
		slog.Error("database did not respond to ping", "error", err)
		panic(err)
	}

	slog.Info("database connection established")
	return db
}
