package edu.ucsb.cs156.dining.jobs;

@FunctionalInterface
public interface Sleeper {
  void sleep(long ms) throws InterruptedException;
}
