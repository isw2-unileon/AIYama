package database

import (
	"log/slog"
	"os"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

var logger = slog.New(slog.NewJSONHandler(os.Stdout, nil))

func InitDB(connStr string) *sqlx.DB {
	var db *sqlx.DB
	var err error
	// retrying connection to database if the PostgreSQL container is still initializing
	for i := 0; i < 5; i++ {
		db, err = sqlx.Connect("postgres", connStr)
		if err == nil {
			break
		}
		logger.Warn("failed trying to connect data base", "try ", i+1, "error ", err)
		time.Sleep(2 * time.Second)
	}

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
