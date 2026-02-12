CREATE TABLE foo (
  id INT PRIMARY KEY,
  varchar_column VARCHAR(255),
  char_column CHAR(10),
  int_column INT,
  float_column FLOAT,
  double_column DOUBLE PRECISION,
  decimal_column DECIMAL(10, 2),
  boolean_column BOOLEAN,
  date_column DATE,
  time_column TIME,
  text_column TEXT
);

CREATE TABLE bar (
  id INT PRIMARY KEY,
  varchar_column VARCHAR(255)
);


INSERT INTO foo (id, varchar_column, char_column, int_column, float_column, double_column, decimal_column, boolean_column, date_column, time_column, text_column)
VALUES
    (1, 'Value 1', 'A', 100, 10.5, 20.75, 7.5, TRUE, '2023-01-15', '12:30:00', 'This is some text data.'),
    (2, 'Value 2', 'B', 200, 15.75, 30.25, 12.3, FALSE, '2023-02-20', '15:45:00', 'More text here.'),
    (3, 'Value 3', 'C', 300, 25.5, 40.0, 18.9, TRUE, '2023-03-10', '09:15:00', 'Additional text data.'),
    (4, 'Value 4', 'D', 400, 30.0, 50.5, 25.2, FALSE, '2023-04-05', '18:00:00', 'Inserting more data.'),
    (5, 'Value 5', 'E', 500, 42.5, 60.75, 33.7, TRUE, '2023-05-12', '14:20:00', 'Fifth set of data.');

