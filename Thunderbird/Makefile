.PHONY: dist upload

all: dist

dist:
	rm -f deeplwrite.xpi
	zip deeplwrite.xpi --exclude '*~' --exclude Makefile -r *

install:
	cp deeplwrite.xpi ~/Documents/Thunderbird/extensions/deeplwrite@itagagaki.xpi

clean:
	rm -f deeplwrite.xpl
