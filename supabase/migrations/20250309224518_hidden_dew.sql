/*
  # Add order queue management

  1. New Tables
    - `order_queue`
      - Manages order processing queue
      - Tracks order priority and status
      - Links orders with processing timestamps

  2. Changes
    - Add queue management system
    - Add priority handling
    - Add processing status tracking

  3. Security
    - Enable RLS
    - Add policies for queue management
*/

CREATE TABLE IF NOT EXISTS order_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 0,
  queue_position integer,
  status text NOT NULL DEFAULT 'waiting',
  called_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT order_queue_status_check 
  CHECK (status IN ('waiting', 'called', 'processing', 'completed'))
);

-- Enable RLS
ALTER TABLE order_queue ENABLE ROW LEVEL SECURITY;

-- Create unique index for queue position
CREATE UNIQUE INDEX idx_order_queue_position 
ON order_queue(queue_position) 
WHERE status = 'waiting';

-- Create index for performance
CREATE INDEX idx_order_queue_status ON order_queue(status);
CREATE INDEX idx_order_queue_priority ON order_queue(priority);

-- Policies for queue management
CREATE POLICY "Cashiers can manage queue"
ON order_queue
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'cashier'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'cashier'
  )
);

CREATE POLICY "Sellers can view queue"
ON order_queue
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'seller'
  )
);

-- Function to automatically assign queue position
CREATE OR REPLACE FUNCTION assign_queue_position()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'waiting' AND NEW.queue_position IS NULL THEN
    SELECT COALESCE(MAX(queue_position), 0) + 1
    INTO NEW.queue_position
    FROM order_queue
    WHERE status = 'waiting';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to manage queue positions
CREATE TRIGGER assign_queue_position_trigger
BEFORE INSERT OR UPDATE ON order_queue
FOR EACH ROW
EXECUTE FUNCTION assign_queue_position();

-- Function to update queue positions when orders are completed or cancelled
CREATE OR REPLACE FUNCTION update_queue_positions()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'waiting' AND NEW.status != 'waiting' THEN
    UPDATE order_queue
    SET queue_position = queue_position - 1
    WHERE status = 'waiting'
    AND queue_position > OLD.queue_position;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update queue positions
CREATE TRIGGER update_queue_positions_trigger
AFTER UPDATE ON order_queue
FOR EACH ROW
WHEN (OLD.status = 'waiting' AND NEW.status != 'waiting')
EXECUTE FUNCTION update_queue_positions();